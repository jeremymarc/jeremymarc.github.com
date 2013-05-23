---
layout: post
title: "Symfony form and doctrine inverse side association"
description: "Symfony form and doctrine inverse side association"
category: 
tags: [doctrine, php, symfony2, form]
---
{% include JB/setup %}

Dealing with doctrine associations is getting more and more simple with new
versions. But doctrine is still based on few concepts which need to be understood.
Owning and reverse side is one of them ; we will see how it can be handled when
working with symfony2 forms.

Imagine the situation where you have a User which can have multiples addresses.
You will create 2 entities like this : 

    {% highlight php linenum %}   
    <?php

    //Entity/User.php
    class User
    {
        /*
         * @ORM\OneToMany(targetEntity="Address", mappedBy="user", cascade={"persist", "remove"})
         */
        private $addresses;
    }
    {% endhighlight %}   

    {% highlight php startinline linenum %}   
    <?php

    //Entity/Address.php
    class Address
    {
        /* 
         * @ORM\ManyToOne(targetEntity="User", inversedBy="addresses")
         */
        private $user;
    }
    {% endhighlight %}   

_Note: You can run ./app/console doctrine:schema:validate to make sure the schema is
correct._         
    
As the user can have multiples addresses, Address entity will be the owning side and
User the inverse side.

Now imagine you want to create a new User using Symfony2 form. The form will
looks like : 

    {% highlight php linenum %}   
    <?php

    // Form/Type/UserType.php
    class UserType extends AbstractType
    {
        public function buildForm(FormBuilderInterface $builder, array $options)
        {
            $builder->add('addresses', 'collection', array(
                'type' => new AddressType(),
                'label' => 'Adresses',
                'allow_add' => true,
                'allow_delete' => true,
                'by_reference' => false,
            ));
        }
    }
    {% endhighlight %}   

_Note: AddressType() is the form for Address containing all informations needed
(address, city etc.)_


Lets do the controller now as usually : 

    {% highlight php linenum %}   
    <?php 

    //Controller/UserController.php
    ...

    public function createUserAction(Request $request)
    {
        $user = new User;
        $form = $this->createForm(new UserType(), $user);
        if ($request->isMethod('POST') && $form->bind($request)->isValid()) {
            $em = $this->getDoctrine()->getEntityManager();
            $em->persist($user); //error throwing
        }
    }
    {% endhighlight %}   

After trying to persist the $user entity (last line), we are getting "user_id cannot be
null" error.

This is due to the owning and inverse side doctrine concept. Doctrine will only
check the owning side of the associations and we are working with the inverse side 
[http://docs.doctrine-project.org/en/latest/reference/unitofwork-associations.html] (http://docs.doctrine-project.org/en/latest/reference/unitofwork-associations.html):

> Doctrine needs to know which of these two in-memory references is the one that
> should be persisted and which not.(...)

> Changes made only to the inverse side of an association are ignored. 
> Make sure to update both sides of a bidirectional association 
> (or at least the owning side, from Doctrine’s point of view).

> The owning side of a bidirectional association is the side Doctrine “looks at”
> when determining the state of the association, and consequently whether there is
> anything to do to update the association in the database.


_Note: for OneToOne association, its depends where the foreign key is stored._

As we cannot change the association direction, the only solution is to manually set 
the association.<br/>
We can do it by 2 ways :

+ updating User.php setAddress method.
+ adding addAddress/removeAddress methods in User.php

## Solution 1. Update setter in User.php
The first solution is to update, as we can do it for OneToOne association, the setter
 in User changing the setter from :

    {% highlight php linenum %}   
    <?php
    ...
    public function setAddresses($addresses) 
    {
        $this->addresses = $addresses;
        return $this;
    }
    {% endhighlight %}   

to :

    {% highlight php linenum %}   
    <?php 
    ...
    public function setAddresses($addresses) 
    {
        $this->addresses = $addresses;
        foreach ($addresses as $address) {
            $address->setUser($this);
        }
        return $this;
    }
    {% endhighlight %}   

This way, the User is directly set when calling :

    {% highlight php linenum %}   
    $user->setAddresses($addresses);
    {% endhighlight %}   

_Note: this solution is working for OneToOne association too._

## Solution 2. Add addXXX/removeXXX methods.
The second solution is to add 2 methods in the User.php entity which will be called
automatically by Symfony (https://github.com/symfony/PropertyAccess/blob/master/PropertyAccessor.php#L323) when adding or removing an Address.

    {% highlight php linenum %}   
    <?php
    ...
    public function addAddress(Address $address)
    {
        $this->addresses[] = $address;
        $address->setUser($this);
        return $this;
    }

    public function removeAddress(Address $address)
    {
        $this->addresses->removeElement($address);
    }
    {% endhighlight %}   
[http://docs.doctrine-project.org/en/latest/reference/working-with-associations.html] (http://docs.doctrine-project.org/en/latest/reference/working-with-associations.html)

If methods are not called, make sure to set the option [by_reference](http://symfony.com/doc/master/reference/forms/types/collection.html#by-reference) to false.

_Note : setting the inversed side of the association is bad for performance. 
You should do it carefully.
[http://docs.doctrine-project.org/en/latest/reference/improving-performance.html] (http://docs.doctrine-project.org/en/latest/reference/improving-performance.html)._

